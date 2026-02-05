import { motion } from 'framer-motion';

export const MenuSkeleton = () => {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex gap-4 animate-pulse">
                    {/* Image Skeleton */}
                    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gray-200 rounded-xl flex-shrink-0" />

                    {/* Content Skeleton */}
                    <div className="flex-1 min-w-0 py-1 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2 w-full">
                                <div className="h-5 bg-gray-200 rounded w-3/4" />
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                            </div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded w-full" />
                        <div className="flex justify-between items-center mt-2">
                            <div className="h-6 bg-gray-200 rounded w-20" />
                            <div className="h-10 bg-gray-200 rounded-xl w-24" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
