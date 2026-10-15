import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import sync_facebook


class PartialFeedTest(unittest.TestCase):
    def test_old_single_post_does_not_advance_sync(self):
        with tempfile.TemporaryDirectory() as directory:
            posts_file = Path(directory) / "posts.json"
            posts_file.write_text(json.dumps({"posts": [{
                "facebook_url": "https://www.facebook.com/unapunooficial/posts/old?tracking=1"
            }]}), encoding="utf-8")
            old_contents = posts_file.read_text(encoding="utf-8")
            with patch.object(sync_facebook, "POSTS_FILE", str(posts_file)):
                self.assertFalse(sync_facebook.format_and_save([{
                    "postUrl": "https://www.facebook.com/unapunooficial/posts/old?tracking=2",
                    "text": "Noticia antigua",
                    "imgUrl": "https://scontent.xx.fbcdn.net/old.jpg",
                }]))
            self.assertEqual(posts_file.read_text(encoding="utf-8"), old_contents)

    def test_two_posts_including_latest_refresh_sync(self):
        with tempfile.TemporaryDirectory() as directory:
            posts_file = Path(directory) / "posts.json"
            posts_js_file = Path(directory) / "posts.js"
            posts_file.write_text(json.dumps({"posts": [
                {"facebook_url": "https://www.facebook.com/unapunooficial/posts/latest"},
                {"facebook_url": "https://www.facebook.com/unapunooficial/posts/previous"},
            ]}), encoding="utf-8")
            extracted = [
                {
                    "postUrl": "https://www.facebook.com/unapunooficial/posts/latest",
                    "text": "Noticia más reciente",
                    "imgUrl": "https://scontent.xx.fbcdn.net/latest.jpg",
                },
                {
                    "postUrl": "https://www.facebook.com/unapunooficial/posts/previous",
                    "text": "Noticia anterior",
                    "imgUrl": "https://scontent.xx.fbcdn.net/previous.jpg",
                },
            ]
            with patch.object(sync_facebook, "POSTS_FILE", str(posts_file)):
                with patch.object(sync_facebook, "POSTS_JS_FILE", str(posts_js_file)):
                    self.assertTrue(sync_facebook.format_and_save(extracted))
            self.assertTrue(posts_js_file.exists())
            self.assertIn("last_sync", json.loads(posts_file.read_text(encoding="utf-8"))["university"])


class TransientFacebookFailureTest(unittest.TestCase):
    def test_empty_response_keeps_workflow_successful(self):
        with patch.object(sync_facebook, "run_sync", return_value=False):
            with patch("sys.argv", ["sync_facebook.py"]):
                sync_facebook.main()


if __name__ == "__main__":
    unittest.main()
