from jupyterlab_knowledge_graph.backlinks import get_uri_name, parse_notebook_file, parse_markdown_file


def build_graph_edges(documents):
    uri_to_name = {str(doc.uri): doc.name for doc in documents if doc.uri}

    return [
        (
            doc.name or get_uri_name(doc.uri),
            uri_to_name.get(link.uri, get_uri_name(link.uri)),
        )
        for doc in documents
        for link in doc.links
    ]


def draw_graph(edges):
    import matplotlib.pyplot as plt

    G = nx.DiGraph()
    for src, dst in links:
        G.add_edge(src, dst)

    d = dict(G.degree)
    nx.draw_spring(G, with_labels=True, node_size=[v * 100 for v in d.values()])

    plt.show()


if __name__ == "__main__":
    base_path = Path.cwd().parent / "nuclear-phd" / "notes-and-tutorials" / "notes"

    search_paths = [*chain(base_path.glob("**/*.ipynb"), base_path.glob("**/*.md"))]

    documents = []
    for path in search_paths:
        rel_path = path.relative_to(base_path)

        with open(path) as f:
            document = (
                parse_notebook_file(rel_path, f)
                if path.suffix == ".ipynb"
                else parse_markdown_file(rel_path, f)
            )
            documents.append(document)

    links = build_graph_edges(documents)

    draw_graph(links)
