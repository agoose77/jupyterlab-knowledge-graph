import networkx as nx
from pathlib import Path
import re
import nbformat
from dataclasses import dataclass
from dataclasses_json import dataclass_json
from urllib.parse import urlparse


@dataclass_json
@dataclass
class Link:
    name: str
    uri: str


@dataclass_json
@dataclass
class LinkedDocument:
    name: str
    uri: str
    links: list[Link]


def parse_markdown_blocks(uri, blocks) -> LinkedDocument:
    title = None

    # Find title
    title_pattern = "^\s*#\s*([^\n#]+.*)$|^\s*([^\n]+)\n(?:-+|=+)$"
    link_pattern = "(?<img>!)?\[(?<name>[^\]]+)]\((?<uri>[^)]+)\)"

    links = []

    for block in blocks:
        # Find all title types
        if m := re.search(title_pattern, block, flags=re.MULTILINE):
            title = m.expand(r"\1\2")

        # Find links
        if m := re.search(link_pattern, block):
            is_img, name, link_uri = m.groups()
            if not is_img:
                # TODO check scheme etc
                try:
                    relative_path = str(Path(link_uri).relative_to(uri))
                except ValueError:
                    relative_path = link_uri
                links.append(Link(name, relative_path))

    return LinkedDocument(title, str(uri), links)


REGISTRY = {}


def parses(ext):
    def wrapper(func):
        REGISTRY[ext] = func
        return func

    return wrapper


def get_parser(path):
    return REGISTRY.get(path.suffix)


def parse_file(path, f) -> LinkedDocument:
    parser = get_parser(path)
    return parser(path, f)


def get_uri_name(uri):
    return urlparse(uri).path.rsplit("/", 1)[-1]


@parses(".ipynb")
def parse_notebook_file(path, f):
    nb = nbformat.read(f, as_version=nbformat.NO_CONVERT)

    md_cells = [c for c in nb.cells if c.cell_type == "markdown"]

    return parse_markdown_blocks(path, (c.source for c in md_cells))


@parses(".md")
def parse_markdown_file(path, f):
    return parse_markdown_blocks(path, (f.read(),))
