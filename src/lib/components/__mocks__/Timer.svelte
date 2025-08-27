<script lang="ts">
	interface Props {
		routeId: number;
	}

	const props: Props = $props();
</script>

<div data-testid="timer-mock">Timer Mock for Route {props.routeId}</div>
