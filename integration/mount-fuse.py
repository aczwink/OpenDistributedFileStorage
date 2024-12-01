import datetime;
import errno;
from functools import partial;
from fusepy import FUSE, FuseOSError, Operations;
import json;
import os;
import requests;
from stat import S_IFDIR, S_IFREG;
import sys;
import yaml;

class FileAttributes:
    def __init__(this, json):
        this.blobId = json["blobId"];
        this.size = json["size"];
        this.creationTime = this._ConvertDate(json["creationTime"]);
        this.lastModifiedTime = this._ConvertDate(json["lastModifiedTime"]);
        this.lastAccessedTime = json["lastAccessedTime"] / 1000;
        
    #Private methods
    def _ConvertDate(this, iso):
        dt = datetime.datetime.fromisoformat(iso);
        return dt.timestamp();

class ODFS:
    def __init__(this, odfsEndpoint, accessToken):
        this._odfsEndpoint = odfsEndpoint;
        this._accessToken = accessToken;
        
    #Public methods
    def DownloadBlobPart(this, blobId, streamingKey, offset, length):
        start = str(offset);
        end = str(offset + length - 1);
        result = this._GetRaw("/stream?blobId=" + str(blobId) + "&streamingKey=" + streamingKey, "bytes=" + start + "-" + end);
        return result;
        
    def CreateStreamingKey(this, fileId):
        result = this._Post("/files/" + str(fileId) + "/stream");
        return result["streamingKey"];
        
    def RequestContainers(this):
        return this._Get("/containers");
        
    def RequestDirContents(this, containerId, dirPath):
        containerId = str(containerId);
        content = this._Get("/containers/" + containerId + "/files?dirPath=" + dirPath);
        return content;
        
    def RequestFileAttributes(this, fileId):
        result = this._Get("/files/" + str(fileId) + "/meta-file-manager");
        return FileAttributes(result);
        
    #Private methods
    def _Get(this, url):
    	response = requests.get(this._odfsEndpoint + url, headers={ "Authorization": "Bearer " + this._accessToken });
    	return response.json();
    	
    def _GetRaw(this, url, rangeHeader):
    	response = requests.get(this._odfsEndpoint + url, headers={ "Authorization": "Bearer " + this._accessToken, "Range": rangeHeader });
    	return response.content;
    	
    def _Post(this, url):
    	response = requests.post(this._odfsEndpoint + url, headers={ "Authorization": "Bearer " + this._accessToken });
    	return response.json();
    	
class CacheEntry:
    def __init__(this, odfs, isDir, requestChildren):
        this._odfs = odfs;
        this.children = None;
        this.isDir = isDir;
        this.fileId = None;
        this.fileAttributes = None;
        this._requestChildren = requestChildren;
        
    #Public methods
    def GetAttributes(this):
        if(this.isDir):
            return dict(
                st_mode=(S_IFDIR | 0o555),
                st_ctime=0,
                st_mtime=0,
                st_atime=0,
                st_nlink=2 + len(this._GetChildren()),
                st_gid=0,
                st_uid=0,
            );
            
        this.GetFileAttributes();
            
        return dict(
            st_mode=(S_IFREG | 0o444),
            st_nlink=1,
            st_size=this.fileAttributes.size,
            st_ctime=this.fileAttributes.creationTime,
            st_mtime=this.fileAttributes.lastModifiedTime,
            st_atime=this.fileAttributes.lastAccessedTime,
        );
        
    def GetFileAttributes(this):
        if(this.fileAttributes is None):
            this.fileAttributes = this._odfs.RequestFileAttributes(this.fileId);
        return this.fileAttributes;
        
    #Private methods        
    def _GetChildren(this):
        if(this.children is None):
            this._requestChildren();
        return this.children;
    	
class ContainerCache:
    def __init__(this, odfs, id):
        this._odfs = odfs;
        this._id = id;
        this._pathCache = {};
        this._openFiles = {};
        
    #Public methods
    def CloseFile(this, fh):
        del this._openFiles[fh];
        
    def DownloadSlice(this, fh, offset, length):
        (streamingKey, blobId) = this._openFiles[fh]
        return this._odfs.DownloadBlobPart(blobId, streamingKey, offset, length);
        
    def GetAttributes(this, path):
        this._EnsureParentIsCached(path);
        
        ce = this._pathCache[path];
        if(ce is None):
            raise FuseOSError(errno.ENOENT);
        return ce.GetAttributes();
            
    def ListDirectoryContents(this, path):
        if(path not in this._pathCache):
            this._CacheChildren(path);
        ce = this._pathCache[path];
        if(ce.children is None):
            this._CacheChildren(path);
                  
        return ce.children;
        
    def OpenFile(this, path):
        this._EnsureParentIsCached(path);
        
        ce = this._pathCache[path];
        streamingKey = this._odfs.CreateStreamingKey(ce.fileId);
        fh = hash(streamingKey) % sys.maxsize;
        this._openFiles[fh] = (streamingKey, ce.GetFileAttributes().blobId);
        
        return fh;
        
    #Private methods
    def _CacheChildren(this, path):
        results = this._odfs.RequestDirContents(this._id, path);
        children = [];
        
        for d in results["dirs"]:
            children.append(d);
            this._EnsureIsInCache(os.path.join(path, d), True);
            
        for f in results["files"]:
            children.append(os.path.basename(f["filePath"]));
            fce = this._EnsureIsInCache(os.path.join(f["filePath"]), False);
            fce.fileId = f["id"];
            
        ce = this._EnsureIsInCache(path, True);
        ce.children = children;
        
    def _EnsureIsInCache(this, path, isDir):
        if(path not in this._pathCache):
            this._pathCache[path] = CacheEntry(this._odfs, isDir, partial(this._CacheChildren, path));
        return this._pathCache[path];
        
    def _EnsureParentIsCached(this, path):
        if(path not in this._pathCache):
            parent = os.path.dirname(path);
            this.ListDirectoryContents(parent);
            if(path not in this._pathCache):
                this._pathCache[path] = None;
            raise FuseOSError(errno.ENOENT);
            

class ODFS_FUSE(Operations):
    def __init__(this, odfs):
        this._odfs = odfs;
        this._containers = None;
        
    #Public methods
    def access(this, path, mode):
        if(mode & os.W_OK):
            raise FuseOSError(errno.EACCES);
        
    def getattr(this, path, fh=None):
        if(path == "/"):
            return this._VirtualFolderStats();
        (container, containerPath) = this._SplitIntoContainerAndPath(path);
            
        return container.GetAttributes(containerPath);
        
    def open(this, path, flags):
        (container, containerPath) = this._SplitIntoContainerAndPath(path);
        return container.OpenFile(containerPath);
        
    def read(this, path, length, offset, fh):
        (container, containerPath) = this._SplitIntoContainerAndPath(path);
        blob = container.DownloadSlice(fh, offset, length);
        return blob;
                     
    def readdir(this, path, fh):
        if(path == "/"):
            this._EnsureHaveContainers();
            return ['.', '..'] + list(this._containers.keys());
        (container, containerPath) = this._SplitIntoContainerAndPath(path);
        return ['.', '..'] + container.ListDirectoryContents(containerPath);
        
    def release(this, path, fh):
        (container, containerPath) = this._SplitIntoContainerAndPath(path);
        container.CloseFile(fh);
        
    def statfs(this, path):
        return dict(f_bsize=512, f_blocks=4096, f_bavail=2048);
        
    #Private methods
    def _EnsureHaveContainers(this):
        if(this._containers is None):
            containers = this._odfs.RequestContainers();
            containersDict = {};
            for c in containers:
                containersDict[c["name"]] = ContainerCache(this._odfs, c["id"]);
            this._containers = containersDict;
    	
    def _SplitIntoContainerAndPath(this, path):
        parts = path.split("/");
        del parts[0];
        
        this._EnsureHaveContainers();            
        if(parts[0] not in this._containers):
            raise FuseOSError(errno.ENOENT);
        
        container = this._containers[parts[0]];
        return (container, "/" + "/".join(parts[1:]));
        
    def _VirtualFolderStats(this):
        return dict(
            st_mode=(S_IFDIR | 0o555),
            st_ctime=0,
            st_mtime=0,
            st_atime=0,
            st_nlink=2,
            st_gid=0,
            st_uid=0,
        );

def RequestAccessToken(url, client_id, client_secret, scope):
	response = requests.post(url, data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret, "scope": scope }, headers={"Content-Type": "application/x-www-form-urlencoded"}, verify=False);
	response.raise_for_status();
	return response.json()["access_token"];


with open(sys.argv[1], 'r') as file:
	config = yaml.safe_load(file);
	
accessToken = RequestAccessToken(config["tokenEndpoint"], config["clientId"], config["clientSecret"], "Files.Read");
odfs = ODFS(config["odfsEndpoint"], accessToken);
FUSE(ODFS_FUSE(odfs), sys.argv[2], nothreads=True, foreground=True); #debug=True

#requires: apt install python3-fusepy
