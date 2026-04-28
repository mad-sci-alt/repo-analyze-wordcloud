interface Props {
  imageDataUrl: string;
}

export function WordCloudDisplay({ imageDataUrl }: Props) {
  return (
    <div className="flex justify-center my-6">
      <img
        src={imageDataUrl}
        alt="Word Cloud"
        className="max-w-md w-full rounded-2xl shadow-lg"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
