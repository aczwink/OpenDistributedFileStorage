# OpenDistributedFileStorage
[![Build docker images](https://github.com/aczwink/OpenDistributedFileStorage/actions/workflows/docker-image.yml/badge.svg)](https://github.com/aczwink/OpenDistributedFileStorage/actions/workflows/docker-image.yml)

A web-based file storage service with distributed storage targets

## Documentation

### Concepts
* A blob is an immutable sequence of bytes defined by its sha256 hash.
* A blob is partitioned into multiple blocks.
* A blob block is also an immutable sequence of bytes defined by its sha256 hash.
* A blob block is stored within one storage block.

TODO: documentation about storage blocks