import * as React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-[#cc5500] text-[#3b2a27] font-semibold hover:bg-[#e06010] transition-colors',
      primary:
        'bg-[#cc5500] text-[#3b2a27] font-semibold hover:bg-[#e06010] transition-colors',
      steel:
        'bg-[#c4956a] text-[#3b2a27] font-semibold hover:bg-[#7a93a7] transition-colors',
      destructive:
        'bg-[#b83a2e]/15 text-[#b83a2e] border border-[#b83a2e]/40 hover:bg-[#b83a2e]/25 transition-colors',
      outline:
        'border border-[#6b4c45] bg-[#4a3330] text-[#f8f4e7] hover:bg-[#5c3d38] hover:text-white transition-colors',
      ghost: 'hover:bg-[#5c3d38] text-[#d4bfb0] hover:text-[#f8f4e7] transition-colors',
    };

    const sizes = {
      default: 'h-9 px-4 py-2 text-xs font-sans font-medium',
      sm: 'h-8 px-3 text-xs font-sans font-medium',
      lg: 'h-10 px-6 text-sm font-sans font-semibold',
      icon: 'h-8 w-8 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#cc5500] disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer',
          variants[variant] || variants.default,
          sizes[size] || sizes.default,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
