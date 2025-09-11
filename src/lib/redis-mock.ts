// Mock Redis implementation for local development
class MockRedis {
  private store = new Map<string, { value: string; expiry?: number }>();

  async setex(key: string, seconds: number, value: string) {
    this.store.set(key, {
      value,
      expiry: Date.now() + seconds * 1000
    });
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const item = this.store.get(key);
    const currentValue = item ? parseInt(item.value) || 0 : 0;
    const newValue = currentValue + 1;
    
    this.store.set(key, {
      value: newValue.toString(),
      expiry: item?.expiry
    });
    
    return newValue;
  }

  async expire(key: string, seconds: number) {
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
      this.store.set(key, item);
    }
  }
}

export const mockRedis = new MockRedis();