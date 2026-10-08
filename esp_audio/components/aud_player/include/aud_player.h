#ifndef AUD_PLAYER_H
#define AUD_PLAYER_H

#include "esp_err.h"
#include "esp_partition.h"

/* Play a WAV file from a mounted filesystem path. */
esp_err_t aud_player_play(const char *filename);

/* Play a WAV stored raw at the start of a flash partition. */
esp_err_t aud_player_play_partition(const esp_partition_t *partition);

/* Play a WAV stored at an offset inside a flash partition, limited to size
 * bytes so a packed multi-clip image can hold more than one file. */
esp_err_t aud_player_play_partition_range(const esp_partition_t *partition,
                                          size_t offset, size_t size);

/*
 * Cuts a playback already in progress short — checked once per DMA chunk
 * inside the streaming loop, so it takes effect within one chunk's worth of
 * audio (a few ms), not at the end of the clip. Safe to call from another
 * task. Each aud_player_play*() call clears this at its own start, so it
 * only affects the playback that's actually running when you call it.
 */
void aud_player_request_stop(void);

#endif
