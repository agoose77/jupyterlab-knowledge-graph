from traitlets import List, Unicode, default
from traitlets.config import Configurable


class KnowledgeGraphConfiguration(Configurable):
    ignore_patterns = List(Unicode())

    @default("ignore_patterns")
    def _ignore_patterns_default(self):
        return ["node_modules", ".git", ".ipynb_checkpoints"]
