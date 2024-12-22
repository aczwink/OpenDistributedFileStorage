/*!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.8-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: opendistributedfilestorage
-- ------------------------------------------------------
-- Server version	10.11.8-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blobblocks`
--

DROP TABLE IF EXISTS `blobblocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobblocks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `size` int(10) unsigned NOT NULL,
  `sha256sum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sha256sum` (`sha256sum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blobblocks_storageblocks`
--

DROP TABLE IF EXISTS `blobblocks_storageblocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobblocks_storageblocks` (
  `blobBlockId` int(10) unsigned NOT NULL,
  `storageBlockId` int(10) unsigned NOT NULL,
  `storageBlockOffset` int(10) unsigned NOT NULL,
  PRIMARY KEY (`blobBlockId`,`storageBlockId`),
  KEY `blockblobs_storageblocks_storageBlockId` (`storageBlockId`),
  CONSTRAINT `blockblobs_storageblocks_blobBlockId` FOREIGN KEY (`blobBlockId`) REFERENCES `blobblocks` (`id`),
  CONSTRAINT `blockblobs_storageblocks_storageBlockId` FOREIGN KEY (`storageBlockId`) REFERENCES `storageblocks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blobs`
--

DROP TABLE IF EXISTS `blobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sha256sum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sha256sum` (`sha256sum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blobs_blocks`
--

DROP TABLE IF EXISTS `blobs_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobs_blocks` (
  `blobId` int(10) unsigned NOT NULL,
  `offset` int(10) unsigned NOT NULL,
  `blobBlockId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`blobId`,`offset`,`blobBlockId`),
  KEY `blobs_blocks_blobBlockId` (`blobBlockId`),
  CONSTRAINT `blobs_blocks_blobBlockId` FOREIGN KEY (`blobBlockId`) REFERENCES `blobblocks` (`id`),
  CONSTRAINT `blobs_blocks_blobId` FOREIGN KEY (`blobId`) REFERENCES `blobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blobs_metadata`
--

DROP TABLE IF EXISTS `blobs_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobs_metadata` (
  `blobId` int(10) unsigned NOT NULL,
  `metadataKey` varchar(50) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `metadata` text NOT NULL,
  PRIMARY KEY (`blobId`,`metadataKey`),
  CONSTRAINT `blobs_metadata_blobId` FOREIGN KEY (`blobId`) REFERENCES `blobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blobs_versions`
--

DROP TABLE IF EXISTS `blobs_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blobs_versions` (
  `blobId` int(10) unsigned NOT NULL,
  `versionBlobId` int(10) unsigned NOT NULL,
  `title` varchar(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`blobId`,`versionBlobId`),
  KEY `files_versions_versionBlobId` (`versionBlobId`),
  CONSTRAINT `files_versions_blobId` FOREIGN KEY (`blobId`) REFERENCES `blobs` (`id`),
  CONSTRAINT `files_versions_versionBlobId` FOREIGN KEY (`versionBlobId`) REFERENCES `blobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `containers`
--

DROP TABLE IF EXISTS `containers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `containers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `requiredClaim` varchar(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `data_encryption_keys`
--

DROP TABLE IF EXISTS `data_encryption_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `data_encryption_keys` (
  `partitionNumber` int(10) unsigned NOT NULL,
  `hexKey` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`partitionNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files`
--

DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `containerId` int(10) unsigned NOT NULL,
  `filePath` varchar(300) NOT NULL,
  `mediaType` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fileName` (`containerId`,`filePath`) USING BTREE,
  CONSTRAINT `files_containerId` FOREIGN KEY (`containerId`) REFERENCES `containers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files_deleted`
--

DROP TABLE IF EXISTS `files_deleted`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `files_deleted` (
  `fileId` int(10) unsigned NOT NULL,
  `deletionTime` datetime NOT NULL,
  PRIMARY KEY (`fileId`),
  CONSTRAINT `files_deleted_fileId` FOREIGN KEY (`fileId`) REFERENCES `files` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files_locations`
--

DROP TABLE IF EXISTS `files_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `files_locations` (
  `fileId` int(10) unsigned NOT NULL,
  `lat` float NOT NULL,
  `lon` float NOT NULL,
  `countryCode` char(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `osmId` varchar(50) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  PRIMARY KEY (`fileId`),
  CONSTRAINT `files_locations_fileId` FOREIGN KEY (`fileId`) REFERENCES `files` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files_revisions`
--

DROP TABLE IF EXISTS `files_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `files_revisions` (
  `fileId` int(10) unsigned NOT NULL,
  `blobId` int(10) unsigned NOT NULL,
  `creationTimestamp` datetime NOT NULL,
  PRIMARY KEY (`fileId`,`blobId`,`creationTimestamp`),
  KEY `files_revisions_blobId` (`blobId`),
  CONSTRAINT `files_revisions_blobId` FOREIGN KEY (`blobId`) REFERENCES `blobs` (`id`),
  CONSTRAINT `files_revisions_fileId` FOREIGN KEY (`fileId`) REFERENCES `files` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `files_tags`
--

DROP TABLE IF EXISTS `files_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `files_tags` (
  `fileId` int(10) unsigned NOT NULL,
  `tagId` int(10) unsigned NOT NULL,
  KEY `files_tags_fileId` (`fileId`),
  KEY `files_tags_tagId` (`tagId`),
  CONSTRAINT `files_tags_fileId` FOREIGN KEY (`fileId`) REFERENCES `files` (`id`),
  CONSTRAINT `files_tags_tagId` FOREIGN KEY (`tagId`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `storagebackends`
--

DROP TABLE IF EXISTS `storagebackends`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `storagebackends` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `config` text NOT NULL,
  `storageTier` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `storagebackends_storageblocks`
--

DROP TABLE IF EXISTS `storagebackends_storageblocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `storagebackends_storageblocks` (
  `storageBackendId` int(10) unsigned NOT NULL,
  `storageBlockId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`storageBackendId`,`storageBlockId`),
  KEY `storagebackends_storageblocks_storageBlockId` (`storageBlockId`),
  CONSTRAINT `storagebackends_storageblocks_storageBackendId` FOREIGN KEY (`storageBackendId`) REFERENCES `storagebackends` (`id`),
  CONSTRAINT `storagebackends_storageblocks_storageBlockId` FOREIGN KEY (`storageBlockId`) REFERENCES `storageblocks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `storageblocks`
--

DROP TABLE IF EXISTS `storageblocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `storageblocks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `iv` char(24) NOT NULL,
  `authTag` char(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `storageblocks_residual`
--

DROP TABLE IF EXISTS `storageblocks_residual`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `storageblocks_residual` (
  `storageBlockId` int(10) unsigned NOT NULL,
  `leftSize` int(10) unsigned NOT NULL,
  PRIMARY KEY (`storageBlockId`),
  CONSTRAINT `storageblocks_residual_storageBlockId` FOREIGN KEY (`storageBlockId`) REFERENCES `storageblocks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `containerId` int(10) unsigned NOT NULL,
  `tag` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag` (`tag`),
  KEY `tags_containerId` (`containerId`),
  CONSTRAINT `tags_containerId` FOREIGN KEY (`containerId`) REFERENCES `containers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-22 22:16:04
