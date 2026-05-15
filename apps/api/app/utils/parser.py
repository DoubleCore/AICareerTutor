def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]
