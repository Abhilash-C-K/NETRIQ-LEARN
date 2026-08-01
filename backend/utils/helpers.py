# General helpers

def chunk_list(data: list, chunk_size: int):
    """Yield successive n-sized chunks from data."""
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]
