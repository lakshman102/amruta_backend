# Key Rotation

The application uses environment-provided cryptographic secrets for JWT signing and MFA-secret encryption.

## Rotation principles

1. Generate new high-entropy secrets with a secure random generator.
2. Store them only in the deployment secret manager/environment.
3. Never commit secrets to source control.
4. Deploy the new configuration through the normal release process.
5. For JWT signing keys, use a planned overlap/versioned key strategy in a production key-management layer so existing tokens can expire naturally.
6. For MFA encryption keys, production rotation must use a key-management design that can decrypt existing ciphertext during migration, re-encrypt records with the new key, then retire the old key.

The current assignment implementation keeps secret management deliberately environment-based. Full external KMS integration is not required by the assignment and is not invented here.
