import networkx as nx
from pathlib import Path
from itertools import chain
import re
import nbformat
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass
class Link:
    name: str
    uri: str


@dataclass
class LinkedDocument:
    name: str
    uri: str
    links: list[Link]


def parse_markdown_blocks(uri, blocks) -> LinkedDocument:
    title = None

    # Find title
    title_pattern = "(?:^\s*#\s*([^\n#]+.*)$)|(?:^\s*([^\n]+)\n(?:\-+|=+)$)"
    links = []

    for cell in blocks:
        # Find all title types
        if m := re.search(title_pattern, cell, flags=re.MULTILINE):
            title = m.expand(r"\1\2")

        # Find links
        if m := re.search("(\!)?\[([^\]]+)\]\(([^\)]+)\)", cell):
            is_img, name, link_uri = m.groups()
            if not is_img:
                links.append(Link(name, link_uri))

    return LinkedDocument(title, str(uri), links)


def parse_notebook_file(uri, f):
    nb = nbformat.read(f, as_version=nbformat.NO_CONVERT)

    md_cells = [c for c in nb.cells if c.cell_type == "markdown"]

    return parse_markdown_blocks(uri, (c.source for c in md_cells))


def parse_markdown_file(uri, f):
    return parse_markdown_blocks(uri, (f.read(),))


def get_uri_name(uri):
    return urlparse(uri).path.rsplit("/", 1)[-1]
