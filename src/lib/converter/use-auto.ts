import { useEditorMounted } from "platejs/react";
import { useEffect } from "react";
import type { ConverterActions, ConverterState } from "~/routes/converter";

const TIMEOUT_MS = 5000;

// Automated loop for processing articles
export function useAutoAccept({
	state,
	setState,
	actions,
}: {
	state?: ConverterState;
	setState?: React.Dispatch<React.SetStateAction<ConverterState>>;
	actions?: ConverterActions;
}) {
	const mounted = useEditorMounted();

	useEffect(() => {
		if (!state || !setState || !actions || !mounted) return;
		if (!state.is_auto_accepting) return;
		if (state.is_loading) return;
		if (state.articles.length === 0) return;

		const process_current_article = async () => {
			const article = state.articles[state.current_index];
			if (!article) {
				// Finished processing all articles
				setState(
					(prev) =>
						({
							...prev,
							is_auto_accepting: false,
						}) satisfies ConverterState,
				);
				return;
			}

			// Check if current article is already published
			if (state.article_mapping?.status === "published") {
				// Skip this article and move to next
				setState(
					(prev) =>
						({
							...prev,
							current_index: prev.current_index + 1,
							auto_accept_progress: {
								...prev.auto_accept_progress,
								processed: prev.auto_accept_progress.processed + 1,
							},
						}) satisfies ConverterState,
				);
				return;
			}

			// Ensure we have converted content (editor is ready)
			if (!state.converted_content || !state.article_mapping) {
				// Wait for editor to load content
				return;
			}

			try {
				// Accept the current article
				await actions.accept_article();

				// Update progress and move to next article
				setState(
					(prev) =>
						({
							...prev,
							current_index: prev.current_index + 1,
							auto_accept_progress: {
								...prev.auto_accept_progress,
								processed: prev.auto_accept_progress.processed + 1,
								successes: prev.auto_accept_progress.successes + 1,
							},
						}) satisfies ConverterState,
				);
			} catch (error) {
				console.error("Auto-accept failed for article:", article.title, error);

				// Record error and continue to next article
				setState(
					(prev) =>
						({
							...prev,
							current_index: prev.current_index + 1,
							auto_accept_progress: {
								...prev.auto_accept_progress,
								processed: prev.auto_accept_progress.processed + 1,
								errors: prev.auto_accept_progress.errors + 1,
							},
							auto_accept_errors: [
								...prev.auto_accept_errors,
								{
									index: prev.current_index,
									article_id: article.old_id,
									title: article.title,
									error: String(error),
								},
							],
						}) satisfies ConverterState,
				);
			}
		};

		// Add a small delay to prevent rapid firing
		const timeout = setTimeout(() => {
			void process_current_article();
		}, TIMEOUT_MS);

		return () => clearTimeout(timeout);
	}, [
		state?.is_auto_accepting,
		state?.is_loading,
		state?.current_index,
		state?.articles,
		state?.article_mapping,
		state?.converted_content,
		actions,
		mounted,
		setState,
		state,
	]);
}
