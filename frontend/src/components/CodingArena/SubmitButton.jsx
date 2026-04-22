import PropTypes from 'prop-types';

export default function SubmitButton({ onSubmit, isLoading = false, disabled = false }) {
  const handleClick = async () => {
    if (!disabled && !isLoading) {
      await onSubmit?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
        isLoading || disabled
          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      {isLoading ? 'Running...' : 'Submit'}
    </button>
  );
}