import unittest
from unittest.mock import patch
from datetime import datetime, timezone
import scheduled_health as scheduler
import reconnect_whoop


class SchedulingTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 27, 22, tzinfo=timezone.utc).timestamp()
        self.failed = dict(status='failed', started_at='2026-10-27T21:54:00Z',
                           finished_at='2026-10-27T21:55:00Z', credential_version='old',
                           error={'code': 'whoop_auth_failed'})

    def test_reconnect_detected_on_next_tick(self):
        self.assertEqual(scheduler.refresh_due(self.failed, self.now, credentials='new'),
                         (True, 'credentials_changed'))

    def test_revoked_grant_is_not_retried_every_five_minutes(self):
        self.assertEqual(scheduler.refresh_due(self.failed, self.now, credentials='old'),
                         (False, 'authorization_required'))

    def test_auth_fallback_retries_hourly(self):
        self.assertEqual(scheduler.refresh_due(self.failed, self.now + 3300, credentials='old'),
                         (True, 'authorization_required'))

    def test_network_failure_keeps_five_minute_retry(self):
        self.failed['error']['code'] = 'network_unavailable'
        self.assertEqual(scheduler.refresh_due(self.failed, self.now, credentials='old'), (True, 'retry'))

    def test_new_wake_refreshes_healthy_source(self):
        self.failed.update(status='success', last_success_at='2026-10-27T21:55:00Z', error={})
        self.assertEqual(scheduler.refresh_due(self.failed, self.now, self.now - 60), (True, 'wake'))

    def test_waits_for_network_after_wake(self):
        self.assertEqual(scheduler.refresh_due(self.failed, self.now, self.now - 10, 'new'),
                         (False, 'wake_settling'))

    def test_missing_credentials_back_off(self):
        self.assertEqual(scheduler.refresh_due(self.failed, self.now), (False, 'authorization_required'))

    def test_reconnect_failure_does_not_publish(self):
        with patch('reconnect_whoop.subprocess.run') as auth, patch('reconnect_whoop.scheduled_health.run') as publish:
            auth.return_value.returncode = 1
            self.assertEqual(reconnect_whoop.main(), 1)
            publish.assert_not_called()

    def test_reconnect_verifies_live_publication(self):
        with patch('reconnect_whoop.subprocess.run') as auth, patch('reconnect_whoop.scheduled_health.run') as publish:
            auth.return_value.returncode = 0
            publish.return_value = {'datasets': {'health': {'status': 'success', 'generated_at': '2026-10-27T22:00:00Z'}}}
            self.assertEqual(reconnect_whoop.main(), 0)
            publish.assert_called_once_with()


if __name__ == '__main__':
    unittest.main()
