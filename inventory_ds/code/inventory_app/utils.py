import requests
from functools import lru_cache
from django.conf import settings


### Identity DS utils
def get_name(id):
    try:
        result = do_get_identity(id)
        return result["name"]
    except:
        return "<unable to fetch name>"


# cached fetch operations (will only make the request over the network once for each ID)
#  - TODO may need some sort of precache fetch on this at startup - but wait till it's a problem
@lru_cache  # can add a max_size
def do_get_identity(id):
    url = settings.IDENTITY_PROVIDER_URL
    resp = requests.get(f"http://{url}/id/{id}") 
    if resp.status_code != 200:
        raise ValueError(
            {
                "error": "Couldn't get identity",
                "status": resp.status_code,
                "message": resp.json(),
            }
        )
    return resp.json()
