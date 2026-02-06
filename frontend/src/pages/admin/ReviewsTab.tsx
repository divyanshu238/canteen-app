import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Lock, Unlock, Flag, Trash2, Edit, Star } from 'lucide-react';

export const ReviewsTab = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ isFlagged: '', isLocked: '' });

    useEffect(() => {
        loadReviews();
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
                <button onClick={loadReviews} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <select
                    value={filter.isFlagged}
                    onChange={(e) => setFilter({ ...filter, isFlagged: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                    <option value="">All Flags</option>
                    <option value="true">Flagged Only</option>
                    <option value="false">Not Flagged</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review) => (
                    <div key={review._id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1 text-yellow-400">
                                <span className="font-bold text-lg">{review.rating}</span>
                                <Star className="w-4 h-4 fill-current" />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOverrideRating(review._id, review.rating)} className="p-1.5 hover:bg-white/10 rounded text-blue-400" title="Override Rating">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleToggleLock(review._id)} className={`p-1.5 hover:bg-white/10 rounded ${review.isLocked ? 'text-red-400' : 'text-gray-400'}`} title="Lock/Unlock">
                                    {review.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleToggleFlag(review._id)} className={`p-1.5 hover:bg-white/10 rounded ${review.isFlagged ? 'text-orange-400' : 'text-gray-400'}`} title="Flag">
                                    <Flag className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(review._id)} className="p-1.5 hover:bg-white/10 rounded text-red-500" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-white/90 text-sm mb-3">"{review.comment}"</p>
                        <div className="text-xs text-white/50 flex justify-between">
                            <span>{review.userId?.name || 'Unknown User'}</span>
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        {review.isFlagged && (
                            <div className="mt-2 text-xs text-orange-300 bg-orange-500/10 px-2 py-1 rounded">
                                Flagged: {review.flagReason}
                            </div>
                        )}
                        {review.isLocked && (
                            <div className="mt-2 text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Locked
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {reviews.length === 0 && !loading && (
                <div className="text-center py-10 text-white/50">No reviews found.</div>
            )}
        </div>
    );
};
