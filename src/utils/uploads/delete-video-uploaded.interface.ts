export interface IDeleteVideoUploaded {
  delete(publicId: string): Promise<void>;
}
