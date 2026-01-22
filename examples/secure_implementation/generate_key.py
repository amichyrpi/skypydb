from skypydb.security import EncryptionManager

# Generate a secure encryption key
encryption_key = EncryptionManager.generate_key()
salt = EncryptionManager.generate_salt()
print(encryption_key) # don't show this key to anyone
print(salt) # don't show this salt to anyone
