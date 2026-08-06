#ifndef DOWNLOADER_H
#define DOWNLOADER_H

#include "esp_err.h"
#include "esp_partition.h"

/* Download a URL into a file on a mounted filesystem (existing behaviour). */
esp_err_t downloader_download_file(
    const char *url,
    const char *path
);

/*
 * Erase an entire partition. Call this before downloader_download_to_partition
 * to guarantee a clean slate, so no bytes from a previous (possibly larger)
 * download can linger past the end of a new, shorter one.
 */
esp_err_t downloader_erase_partition(const esp_partition_t *partition);

/*
 * Stream a URL directly into a raw flash partition using the esp_partition
 * API. The data is written sequentially, erasing each 4 KB sector just before
 * it is written, and never buffering the whole file in RAM. The final partial
 * sector is zero-padded. Fails with ESP_ERR_NO_MEM if the file is larger than
 * the partition.
 */
esp_err_t downloader_download_to_partition(
    const char *url,
    const esp_partition_t *partition
);

#endif
