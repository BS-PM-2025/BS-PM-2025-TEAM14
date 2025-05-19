from backend.tests.test_main_utils import *
import backend.main
import backend.db_connection
import backend.config

def test_import_everything():
    assert backend.main is not None
    assert backend.db_connection is not None
    assert backend.config is not None
