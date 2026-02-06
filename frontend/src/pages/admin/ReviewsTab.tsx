
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Lock, Unlock, Flag, Trash2, Edit, Star, Filter } from 'lucide-react';

export const ReviewsTab = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ isFlagged: '', isLocked: '' });

    useEffect(() => {
        loadReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listReviews({
                isFlagged: filter.isFlagged || undefined,
                isLocked: filter.isLocked || undefined,
                limit: 50
            });
            setReviews(res.data.data);
        } catch (error) {
            console.error('Failed to load reviews', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFlag = async (reviewId: string) => {
        const reason = prompt('Reason for flagging/unflagging:');
        try {
            await superadminAPI.toggleReviewFlag(reviewId, reason || undefined);
            loadReviews();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Action failed');
        }
    };

    const handleToggleLock = async (reviewId: string) => {
        try {
            await superadminAPI.lockReview(reviewId);
            loadReviews();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Action failed');
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        const reason = prompt('Reason for deletion:');
        if (!reason) return;
        try {
            await superadminAPI.deleteReview(reviewId, reason);
            loadReviews();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Delete failed');
        }
    };

    const handleOverrideRating = async (reviewId: string, currentRating: number) => {
        const newRatingStr = prompt(`Override Rating (Current: ${currentRating})\nEnter new rating (1-5):`);
        if (!newRatingStr) return;
        const newRating = parseInt(newRatingStr);
        if (isNaN(newRating) || newRating < 1 || newRating > 5) {
            alert('Invalid rating');
            return;
        }
        const reason = prompt('Reason for override:');
        if (!reason) return;

        try {
            await superadminAPI.overrideRating(reviewId, newRating, reason);
            loadReviews();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Override failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <button onClick={loadReviews} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={filter.isFlagged}
                        onChange={(e) => setFilter({ ...filter, isFlagged: e.target.value })}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                    >
                        <option value="">All Reviews</option>
                        <option value="true">Flagged Only</option>
                        <option value="false">Not Flagged</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review) => (
                    <div key={review._id} className="bg-white border border-gray-200 rounded-xl p-5 relative group shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-1 rounded-md">
                                <span className="font-bold text-lg leading-none">{review.rating}</span>
                                <Star className="w-4 h-4 fill-current" />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOverrideRating(review._id, review.rating)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Override Rating">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleToggleLock(review._id)} className={`p-1.5 hover:bg-gray-100 rounded ${review.isLocked ? 'text-red-500' : 'text-gray-400'}`} title="Lock/Unlock">
                                    {review.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleToggleFlag(review._id)} className={`p-1.5 hover:bg-gray-100 rounded ${review.isFlagged ? 'text-orange-500' : 'text-gray-400'}`} title="Flag">
                                    <Flag className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(review._id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-800 text-sm mb-4 leading-relaxed">"{review.comment}"</p>
                        <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                            <div>
                                <div className="text-sm font-medium text-gray-900">{review.userId?.name || 'Unknown User'}</div>
                                <div className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                {review.isFlagged && (
                                    <div className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1">
                                        <Flag className="w-3 h-3" /> Flagged: {review.flagReason}
                                    </div>
                                )}
                                {review.isLocked && (
                                    <div className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Locked
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {reviews.length === 0 && !loading && (
                <div className="text-center py-10 text-gray-500">No reviews found.</div>
            )}
        </div>
    );
};
