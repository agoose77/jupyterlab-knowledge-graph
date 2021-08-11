import json

from .document import get_parser
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

from itertools import chain
from pathlib import Path
from fnmatch import fnmatch


class DocumentsHandler(APIHandler):
    def initialize(self, config):
        self.graph_config = config

    def find_documents(self, path):
        assert path.is_dir()

        for p in path.iterdir():
            if any(fnmatch(p.name, r) for r in self.graph_config.ignore_patterns):
                continue

            if p.is_dir():
                yield from self.find_documents(p)
                continue

            if (parser := get_parser(p)):
                with open(p) as f:
                    yield parser(p, f)

    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        app = self.settings["serverapp"]
        root_path = Path(app.root_dir)

        self.finish(json.dumps([d.to_dict() for d in self.find_documents(root_path)]))


def setup_handlers(web_app, config):
    host_pattern = ".*$"

    handler_config = {"config": config}
    base_url = web_app.settings["base_url"]
    documents_pattern = url_path_join(
        base_url, "jupyterlab-knowledge-graph", "api", "documents"
    )
    handlers = [(documents_pattern, DocumentsHandler, handler_config)]
    web_app.add_handlers(host_pattern, handlers)
