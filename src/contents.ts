import { Contents } from "@jupyterlab/services";

export async function recursiveWalk(
  contents: Contents.IManager,
  path: string,
  filter: any
): Promise<Contents.IModel[]> {
  let documents: Contents.IModel[] = [];
  let dirModels: Contents.IModel[] = [await contents.get(path)];

  let dirModel;
  while ((dirModel = dirModels.shift())) {
    // For each content in directory
    for (let model of dirModel.content) {
      // Ignore non-filtered paths
      if (!filter(model)) {
        continue;
      }

      // Push new directories to stack
      if (model.type === "directory") {
        // Retrieve model metadata
        dirModels.push(await contents.get(model.path));
      } else {
        documents.push(model);
      }
    }
  }

  return documents;
}
