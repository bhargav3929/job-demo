// Utility function for conditional class names (like clsx/tailwind-merge)
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
