import { X } from 'lucide-react';

interface ExceptionModalProps {
    isOpen: boolean;
    task: any;
    exceptionReason: string;
    exceptionQuantity: string;
    onReasonChange: (value: string) => void;
    onQuantityChange: (value: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export default function ExceptionModal({
    isOpen,
    task,
    exceptionReason,
    exceptionQuantity,
    onReasonChange,
    onQuantityChange,
    onSubmit,
    onClose
}: ExceptionModalProps) {
    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Report Exception</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <p className="text-sm text-gray-900 font-medium">{task.product.name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exception Reason *
                        </label>
                        <input
                            type="text"
                            value={exceptionReason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder="e.g., Damaged, Missing, Incorrect"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Actually Picked (Max: {task.quantity})
                        </label>
                        <input
                            type="number"
                            value={exceptionQuantity}
                            onChange={(e) => onQuantityChange(e.target.value)}
                            min="0"
                            max={task.quantity}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSubmit}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                        >
                            Submit Exception
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
