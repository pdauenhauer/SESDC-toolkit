# Thin entry point so Firebase discovers HTTP functions.
# Heavy deps (numpy, pandas, calculations, requests, google.cloud) are
# lazy-loaded inside handlers / simulation / nrel / storage.

from handlers import get_stored_simulation, run_simulation_post

__all__ = ["get_stored_simulation", "run_simulation_post"]
