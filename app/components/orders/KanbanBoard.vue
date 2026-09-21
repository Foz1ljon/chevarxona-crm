<script setup lang="ts">
  import { canTransition, type OrderStatus } from "#shared/utils/orderStatus";

  interface Lane {
    status: OrderStatus;
    count: number;
    value: number;
    outstanding: number;
    orders: Array<Record<string, unknown>>;
  }

  const props = defineProps<{
    lanes: Lane[];
    canDrag: boolean;
    loading?: boolean;
  }>();

  const emit = defineEmits<{ moved: [] }>();

  const { formatMoneyCompact } = useFormat();
  const { orderStatus } = useLabels();
  const { t } = useI18n();
  const toast = useApiToast();
  const { changeStatus } = useOrders();

  /** Local mirror so a drop repaints instantly, before the refresh lands. */
  const lanes = ref<Lane[]>([]);
  watch(
    () => props.lanes,
    (value) => {
      lanes.value = structuredClone(toRaw(value)) as Lane[];
    },
    {
      immediate: true,
      deep: true,
    },
  );

  const dragging = ref<{ id: string; from: OrderStatus } | null>(null);
  const hoverLane = ref<OrderStatus | null>(null);
  const saving = ref<string | null>(null);

  const toneHeader: Record<string, string> = {
    neutral: "text-toned",
    primary: "text-primary",
    secondary: "text-secondary",
    success: "text-success",
    info: "text-info",
    warning: "text-warning",
    error: "text-error",
  };

  function onDragStart(event: DragEvent, orderId: string, from: OrderStatus) {
    if (!props.canDrag) return;
    dragging.value = { id: orderId, from };
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData("text/plain", orderId);
  }

  /** A lane only accepts the drop when the status machine allows the move. */
  function isDropTarget(status: OrderStatus) {
    if (!dragging.value) return false;
    if (dragging.value.from === status) return false;
    return canTransition(dragging.value.from, status);
  }

  function onDragOver(event: DragEvent, status: OrderStatus) {
    if (!isDropTarget(status)) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
    hoverLane.value = status;
  }

  async function onDrop(event: DragEvent, target: OrderStatus) {
    event.preventDefault();
    hoverLane.value = null;

    const drag = dragging.value;
    dragging.value = null;
    if (!drag || !isDropTarget(target)) return;

    const fromLane = lanes.value.find((lane) => lane.status === drag.from);
    const toLane = lanes.value.find((lane) => lane.status === target);
    if (!fromLane || !toLane) return;

    const index = fromLane.orders.findIndex((order) => order._id === drag.id);
    if (index === -1) return;

    // Optimistic move — restored in the catch if the server rejects it.
    const [order] = fromLane.orders.splice(index, 1);
    fromLane.count--;
    toLane.orders.unshift({ ...order!, status: target });
    toLane.count++;

    saving.value = drag.id;

    try {
      await changeStatus(drag.id, target);
      const meta = orderStatus(target);
      toast.success(t("orders.movedTo", { status: meta.label }), meta.description);
      emit("moved");
    } catch (error) {
      toLane.orders.shift();
      toLane.count--;
      fromLane.orders.splice(index, 0, order!);
      fromLane.count++;
      toast.error(error, t("orders.moveFailed"));
    } finally {
      saving.value = null;
    }
  }
</script>

<template>
  <div class="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x">
    <section
      v-for="lane in lanes"
      :key="lane.status"
      class="w-68 shrink-0 flex flex-col rounded-lg bg-elevated/40 ring ring-default snap-start"
      :class="hoverLane === lane.status ? 'kanban-drag-over' : ''"
      :aria-label="`${orderStatus(lane.status).label} — ${$t('orders.ordersCount', { n: lane.count })}`"
      @dragover="onDragOver($event, lane.status)"
      @dragleave="hoverLane = null"
      @drop="onDrop($event, lane.status)"
    >
      <header class="px-3 py-2.5 border-b border-default shrink-0">
        <div class="flex items-center gap-2">
          <UIcon :name="orderStatus(lane.status).icon" class="size-4 shrink-0" :class="toneHeader[orderStatus(lane.status).color]" />
          <h3 class="text-xs font-semibold uppercase tracking-wide truncate flex-1 text-toned">
            {{ orderStatus(lane.status).short }}
          </h3>
          <UBadge :label="String(lane.count)" size="sm" variant="subtle" color="neutral" />
        </div>
        <p v-if="lane.value" class="text-[11px] text-muted mt-1 tabular-nums">
          {{ formatMoneyCompact(lane.value) }}
          <span v-if="lane.outstanding > 0" class="text-warning"> · {{ $t('dashboard.due', { amount: formatMoneyCompact(lane.outstanding) }) }} </span>
        </p>
      </header>

      <div class="flex-1 p-2 space-y-2 overflow-y-auto min-h-32 max-h-[calc(100vh-17rem)]">
        <template v-if="loading">
          <USkeleton v-for="n in 2" :key="n" class="h-24 w-full rounded-lg" />
        </template>

        <p v-else-if="!lane.orders.length" class="text-xs text-dimmed text-center py-8 px-2">
          {{ isDropTarget(lane.status) ? $t('orders.dropHere') : $t('orders.empty') }}
        </p>

        <OrdersOrderCard
          v-for="order in lane.orders"
          v-else
          :key="order._id as string"
          :order="order as never"
          :draggable="canDrag"
          :class="saving === order._id ? 'opacity-50 pointer-events-none' : ''"
          @dragstart="onDragStart($event, order._id as string, lane.status)"
          @dragend="
            dragging = null;
            hoverLane = null;
          "
        />
      </div>
    </section>
  </div>
</template>
