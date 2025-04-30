import firebase_admin
from firebase_admin import credentials, storage

if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccount.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'sesdc-function-test.firebasestorage.app'
    })

def get_storage_bucket():
    return storage.bucket()