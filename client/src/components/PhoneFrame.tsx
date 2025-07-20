import { cn } from "@/lib/utils";

interface PhoneFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function PhoneFrame({ children, className, ...props }: PhoneFrameProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-900 flex items-center justify-center p-4">
      <div
        className={cn(
          "relative mx-auto h-[844px] w-[390px] bg-background rounded-[60px] border-[14px] border-black shadow-2xl overflow-hidden",
          "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-1/2 before:h-7 before:bg-black before:rounded-b-3xl",
          className
        )}
        {...props}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-b-xl z-50" />

        {/* Content Container */}
        <div className="absolute inset-0 overflow-hidden rounded-[46px]">
          {/* Content Scroll Area */}
          <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}