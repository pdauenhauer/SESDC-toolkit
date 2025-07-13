import firebase_admin
from firebase_admin import credentials, storage

if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccount.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'sesdc-toolkit2.firebasestorage.app'
    })

def get_storage_bucket():
    return storage.bucket()