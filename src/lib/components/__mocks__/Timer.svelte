<script lang="ts">
	interface Props {
		routeId: number;
		routeName: string;
	}

	const props: Props = $props();
</script>

<div data-testid="timer-mock">Timer Mock for Route {props.routeId}</div>
