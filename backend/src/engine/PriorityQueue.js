/**
 * Min-Heap Priority Queue for optimal A* performance
 */
export class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  push(item, priority) {
    const node = { item, priority };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min.item;
  }

  _bubbleUp(index) {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (node.priority >= parent.priority) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = node;
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const node = this.heap[index];
    const halfLength = Math.floor(length / 2);

    while (index < halfLength) {
      let leftIdx = 2 * index + 1;
      let rightIdx = leftIdx + 1;
      let bestIdx = leftIdx;

      if (rightIdx < length && this.heap[rightIdx].priority < this.heap[leftIdx].priority) {
        bestIdx = rightIdx;
      }

      if (this.heap[bestIdx].priority >= node.priority) break;

      this.heap[index] = this.heap[bestIdx];
      index = bestIdx;
    }
    this.heap[index] = node;
  }
}
