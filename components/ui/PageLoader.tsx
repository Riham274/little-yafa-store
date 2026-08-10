import Spinner from "./Spinner";

export default function PageLoader() {
  return (
    <div className="w-full min-h-[50vh] flex items-center justify-center">
      <Spinner size={48} />
    </div>
  );
}
