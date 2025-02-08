import firebase_admin
from firebase_admin import credentials, storage

if not firebase_admin._apps:
    cred = credentials.Certificate('sesdc-function-test-firebase-adminsdk-v4a1d-cf521b60f2.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'sesdc-function-test.firebasestorage.app'
    })

def get_storage_bucket():
    return storage.bucket()