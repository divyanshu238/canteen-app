// Page Transitions
export const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } }
};

// Staggered Container for Lists
export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

// Standard Fade In Up (for items in a list)
export const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 20
        }
    }
};

// Card Hover Effects
export const cardVariants = {
    hover: {
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: {
        scale: 0.95
    }
};

// Bounce (for badges)
export const bounce = {
    initial: { scale: 0 },
    animate: {
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 20
        }
    }
};

export const springTransition = { type: "spring", stiffness: 300, damping: 30 };
