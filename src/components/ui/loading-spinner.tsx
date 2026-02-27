import logo from "@/assets/logo.png";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className = "" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-[4.5rem] h-[4.5rem]",
    md: "w-[7.5rem] h-[7.5rem]",
    lg: "w-[10.5rem] h-[10.5rem]",
  };

  return (
    <img 
      src={logo} 
      alt="Carregando" 
      className={`${sizeClasses[size]} animate-pulse ${className}`}
    />
  );
};

export const FullPageLoading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );
};
