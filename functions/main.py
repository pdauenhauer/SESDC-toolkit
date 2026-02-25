# Thin entry point so Firebase discovers HTTP functions.
# Heavy deps (numpy, pandas, calculations, requests, google.cloud) are
# lazy-loaded inside handlers / simulation / nrel / storage.

from handlers import run_simulation_post, simulation_metadata_get

__all__ = ["simulation_metadata_get", "run_simulation_post"]
