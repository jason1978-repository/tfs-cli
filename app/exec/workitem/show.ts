import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemShow {
	return new WorkItemShow(args);
}

export class WorkItemShow extends witBase.WorkItemBase<witContracts.WorkItem> {
	protected description = "Show Work Item details.";

	protected getHelpArgs(): string[] {
		return ["workItemId"];
	}

	public exec(): Q.Promise<witContracts.WorkItem> {
		var witapi: witClient.IQWorkItemTrackingApi = this.webApi.getQWorkItemTrackingApi();
		return this.commandArgs.workItemId.val().then((workItemId) => {
			return witapi.getWorkItem(workItemId)
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}