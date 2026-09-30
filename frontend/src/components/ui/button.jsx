import * as React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-[#9AAA78] text-[#141516] font-semibold hover:bg-[#A9B989] transition-colors',
      primary:
        'bg-[#9AAA78] text-[#141516] font-semibold hover:bg-[#A9B989] transition-colors',
      steel:
        'bg-[#8CA4B8] text-[#141516] font-semibold hover:bg-[#7a93a7] transition-colors',
      destructive:
        'bg-[#C95F5F]/15 text-[#C95F5F] border border-[#C95F5F]/40 hover:bg-[#C95F5F]/25 transition-colors',
      outline:
        'border border-[#303334] bg-[#1E2021] text-[#F1F0EA] hover:bg-[#252728] hover:text-white transition-colors',
      ghost: 'hover:bg-[#252728] text-[#A4A5A0] hover:text-[#F1F0EA] transition-colors',
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
          'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9AAA78] disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer',
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
