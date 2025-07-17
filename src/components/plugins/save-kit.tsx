import type { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { createStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Value } from "platejs";
import { createPlatePlugin, Key } from "platejs/react";
import { PublishDialog } from "../../routes/admin/osnutki/-publish-dialog";

type AutoSaveStorage = {
	value: Value;
	timestamp: Date;
};

// default is localstorage
const autosave_atom = atomWithStorage<AutoSaveStorage | undefined>(
	"autosave",
	undefined,
);

const autosave_store = createStore();

type UpdateDraftMutation = (
	args: typeof api.articles.update_draft._args,
) => void;

type PublishDraftMutation = (
	args: typeof api.articles.publish_draft._args,
) => void;

export const SavePlugin = createPlatePlugin({
	key: "save",
	options: {
		article_id: undefined as Id<"articles"> | undefined,
		update_draft: undefined as UpdateDraftMutation | undefined,
	},
	handlers: {
		/* onBlur: (context) => {
			const value = context.editor.children;
			autosave_store.set(autosave_atom, { value, timestamp: new Date() });
			console.log("Autosaving...", value);
		}, */
	},
})
	.extendApi((context) => ({
		save: async () => {
			const value = context.editor.children;
			autosave_store.set(autosave_atom, { value, timestamp: new Date() });
			const update_draft = context.getOption("update_draft");
			const article_id = context.getOption("article_id");

			if (!update_draft || !article_id) {
				console.error("Update draft function or article ID is not set.");
				return;
			}

			update_draft({
				id: article_id,
				content_json: JSON.stringify(value),
			});
		},
	}))
	.extend(() => ({
		shortcuts: {
			save: {
				keys: [[Key.Control, "s"]],
				preventDefault: true,
			},
		},
	}));

export const PublishPlugin = createPlatePlugin({
	key: "publish",
	options: {
		article_id: undefined as Id<"articles"> | undefined,
		publish_draft: undefined as PublishDraftMutation | undefined,
		open_dialogue: false,
	},
}).extendApi((context) => ({
	publish: async () => {
		const value = context.editor.children;
		autosave_store.set(autosave_atom, { value, timestamp: new Date() });
		const publish_draft = context.getOption("publish_draft");
		const article_id = context.getOption("article_id");

		if (!publish_draft || !article_id) {
			console.error("Publish draft function or article ID is not set.");
			return;
		}

		/* publish_draft({
			id: article_id,
			content_json: JSON.stringify(value),
		}); */
		context.setOption("open_dialogue", true);
		console.log("Publishing draft...", { context, opts: context.getOptions() });
	},
}));

export const SaveKit = [
	SavePlugin,
	PublishPlugin.configure({
		render: {
			afterEditable: () => <PublishDialog />,
		},
	}),
];
