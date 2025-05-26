export interface IRepository {
  exists(
    collectionName: string,
    field: string,
    value: string,
  ): Promise<boolean>;
}
