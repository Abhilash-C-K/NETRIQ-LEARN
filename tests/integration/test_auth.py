import unittest
from unittest.mock import AsyncMock, patch
import time

from backend.auth.auth_service import AuthService
from backend.auth.exceptions import AccountLockedError, InvalidCredentialsError

class TestAuthIntegration(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.patcher_repo = patch('backend.auth.auth_service.users_repo')
        self.mock_users_repo = self.patcher_repo.start()
        
        self.patcher_verify = patch('backend.auth.auth_service.verify_password')
        self.mock_verify = self.patcher_verify.start()
        
        self.patcher_jwt_a = patch('backend.auth.auth_service.create_access_token')
        self.mock_jwt_a = self.patcher_jwt_a.start()
        
        self.patcher_jwt_r = patch('backend.auth.auth_service.create_refresh_token')
        self.mock_jwt_r = self.patcher_jwt_r.start()

        self.service = AuthService()

    def tearDown(self):
        patch.stopall()

    async def test_login_lockout_enforcement(self):
        """Test that 5 failed attempts locks the user out."""
        # Setup mock user that is NOT locked yet, but has 4 failed attempts
        mock_user = {
            "id": "u1",
            "email": "test@test.com",
            "hashed_password": "hash",
            "failed_login_attempts": 4,
            "locked_until": 0
        }
        self.mock_users_repo.list.return_value = [mock_user]
        self.mock_verify.return_value = False # Force a failed login
        
        # 5th failed attempt should trigger lockout update
        with self.assertRaises(InvalidCredentialsError):
            await self.service.login("test@test.com", "wrong")
            
        # Verify repository was called to update lockout
        self.mock_users_repo.update.assert_called_once()
        update_args = self.mock_users_repo.update.call_args[0][1]
        self.assertIn("locked_until", update_args)
        self.assertGreater(update_args["locked_until"], time.time())

    async def test_login_locked_rejection(self):
        """Test that an already locked account rejects login immediately."""
        mock_user = {
            "id": "u1",
            "email": "test@test.com",
            "locked_until": time.time() + 300 # Locked for 5 more minutes
        }
        self.mock_users_repo.list.return_value = [mock_user]
        
        with self.assertRaises(AccountLockedError):
            await self.service.login("test@test.com", "any")

if __name__ == '__main__':
    unittest.main()
