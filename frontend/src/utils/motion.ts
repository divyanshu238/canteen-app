// Page Transitions
export const pageVariants = {
    initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
    animate: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
    },
    exit: {
        opacity: 0,
        scale: 1.02,
        filter: 'blur(4px)',
        transition: { duration: 0.2, ease: "easeIn" }
    }
};

// Staggered Container for Lists
export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.05
        }
    }
};

// Standard Fade In Up (for items in a list)
export const fadeInUp = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
            mass: 0.8
        }
    }
};

// Slide In From Right (for Drawers/Sidebars)
export const slideInRight = {
    hidden: { x: '100%', opacity: 0 },
    show: {
        x: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: {
        x: '100%',
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

// Card Hover Effects
export const cardHover = {
    hover: {
        y: -6,
        scale: 1.02,
        boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
        transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: {
        scale: 0.96,
        transition: { type: "spring", stiffness: 400, damping: 10 }
    }
};

// Explicit Card Variants (for staggered lists)
export const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 120, damping: 14 }
    }
};

// Simple Hover Lift
export const hoverLift = {
    hover: {
        y: -5,
        transition: { type: "spring", stiffness: 400, damping: 10 }
    }
};

// Button Interactions
export const buttonClick = {
    hover: { scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 10 } },
    tap: { scale: 0.92, transition: { type: "spring", stiffness: 400, damping: 10 } }
};

// Bounce (for badges/icons)
export const bounce = {
    initial: { scale: 0, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 10,
            delay: 0.2
        }
    }
};

// Pulse Animation (for live status)
export const pulse = {
    animate: {
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

export const springTransition = { type: "spring", stiffness: 300, damping: 30 };
