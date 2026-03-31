function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[120px]">
      <div
        className={`animate-spin rounded-full border-indigo-500 border-t-transparent ${sizeClasses[size] || sizeClasses.md}`}
      />
    </div>
  );
}

export default LoadingSpinner;
