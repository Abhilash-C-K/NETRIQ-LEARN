import unittest
from unittest.mock import AsyncMock, patch
import time

from backend.auth.jwt_handler import create_access_token, decode_token
from backend.auth.password import hash_password, verify_password, validate_password_policy
from backend.auth.exceptions import WeakPasswordError, TokenExpiredError
from backend.auth.roles import Role, Capabilities, PERMISSION_MATRIX

class TestAuthModule(unittest.IsolatedAsyncioTestCase):
    
    def test_password_hashing(self):
        """Test that passwords hash correctly and verify securely."""
        plain = "SuperS3cret!"
        hashed = hash_password(plain)
        
        self.assertNotEqual(plain, hashed)
        self.assertTrue(verify_password(plain, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_password_policy(self):
        """Test password complexity enforcement."""
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("short") # too short
            
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("nouppercase123") # no upper
            
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("NOLOWERCASE123") # no lower
            
        self.assertTrue(validate_password_policy("ValidPassw0rd!"))

    def test_jwt_generation_and_decode(self):
        """Test that JWT tokens encode and decode claims properly."""
        token = create_access_token("user_123", Role.ANALYST.value)
        payload = decode_token(token)
        
        self.assertEqual(payload["sub"], "user_123")
        self.assertEqual(payload["role"], Role.ANALYST.value)
        self.assertEqual(payload["type"], "access")

    @patch('backend.auth.jwt_handler.JWT_ACCESS_EXPIRY_MINUTES', -1)
    def test_jwt_expiration(self):
        """Test that expired JWT tokens raise TokenExpiredError."""
        # Due to patch, token is instantly expired upon creation
        token = create_access_token("user_123", Role.VIEWER.value)
        with self.assertRaises(TokenExpiredError):
            decode_token(token)

    def test_role_matrix_completeness(self):
        """Ensure all defined roles have an entry in the permissions matrix."""
        for role in Role:
            self.assertIn(role, PERMISSION_MATRIX)
            
        # Admin should have all capabilities
        self.assertEqual(len(PERMISSION_MATRIX[Role.ADMIN]), len(Capabilities))

if __name__ == '__main__':
    unittest.main()
