import { Contents } from "@jupyterlab/services";
import { IRenderMime, RenderMimeRegistry } from "@jupyterlab/rendermime";
import { PathExt } from "@jupyterlab/coreutils";
import { Record, Link } from "./record";

export interface ModelParser {
  (model: Contents.IModel, resolver: IRenderMime.IResolver): Promise<Record>;
}

export interface ModelParsers {
  [extension: string]: ModelParser;
}

export class ModelParserRegistry {
  private _parsers: ModelParsers = {};

  register(ext: string, parser: ModelParser) {
    this._parsers[ext] = parser;
  }

  get parsers(): ModelParsers {
    return this._parsers;
  }

  private readonly _contents: Contents.IManager;
  constructor(contents: Contents.IManager) {
    this._contents = contents;
  }

  async parse(model: Contents.IModel): Promise<Record> {
    const resolver = new RenderMimeRegistry.UrlResolver({
      path: model.path,
      contents: this._contents,
    });

    // Find parser
    const parser = this._parsers[PathExt.extname(model.path)];
    if (parser === undefined) {
      throw new Error(`Couldn't find parser for ${model.path}`);
    }
    // Create document
    return await parser(model, resolver);
  }
}

export async function parseMarkdownBlocks(
  path: string,
  blocks: string[],
  resolver: IRenderMime.IResolver
): Promise<Record> {
  let titlePattern = /^\s*#\s*([^\n#]+.*)$|^\s*([^\n]+)\n(?:-+|=+)$/m;
  let linkPattern = /(?<img>!)?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)/gm;

  let title = PathExt.basename(path);
  let links: Link[] = [];

  for (let block of blocks) {
    // Find title
    let titleMatch = block.match(titlePattern);
    if (titleMatch !== null) {
      title = titleMatch.slice(1).join("");
    }

    // Find links
    for (let match of block.matchAll(linkPattern)) {
      // We need groups!
      if (match.groups === undefined) {
        continue;
      }

      // If we have an image, skip
      if (match.groups.img !== undefined) {
        continue;
      }

      // Links within this document may be relative to the document
      const localURL = match.groups.url;
      const absoluteURL = await resolver.resolveUrl(localURL);

      // Create link, with absolute URL
      links.push({
        name: match.groups.name,
        uri: await resolver.getDownloadUrl(absoluteURL),
      });
    }
  }
  return {
    name: title,
    uri: await resolver.getDownloadUrl(path),
    path: path,
    links: links,
  };
}

export async function parseMarkdownDocument(
  model: Contents.IModel,
  resolver: IRenderMime.IResolver
) {
  return await parseMarkdownBlocks(model.path, [model.content], resolver);
}

export async function parseNotebookDocument(
  model: Contents.IModel,
  resolver: IRenderMime.IResolver
) {
  const blocks = model.content.cells
    .filter((cell: any) => {
      return cell.cell_type === "markdown";
    })
    .map((cell: any) => {
      return cell.source;
    });
  return await parseMarkdownBlocks(
    model.path,
    blocks === undefined ? [] : blocks,
    resolver
  );
}
