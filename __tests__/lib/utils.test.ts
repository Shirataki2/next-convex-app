import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn (clsx + tailwind-merge)", () => {
    it("単一のクラス名が正しく処理される", () => {
      const result = cn("text-red-500");
      expect(result).toBe("text-red-500");
    });

    it("複数のクラス名が結合される", () => {
      const result = cn("text-red-500", "bg-blue-500", "p-4");
      expect(result).toBe("text-red-500 bg-blue-500 p-4");
    });

    it("条件付きクラスが正しく処理される", () => {
      const result = cn("text-red-500", true && "bg-blue-500", false && "p-4");
      expect(result).toBe("text-red-500 bg-blue-500");
    });

    it("オブジェクト形式の条件付きクラスが処理される", () => {
      const result = cn({
        "text-red-500": true,
        "bg-blue-500": false,
        "p-4": true,
      });
      expect(result).toBe("text-red-500 p-4");
    });

    it("配列形式のクラスが処理される", () => {
      const result = cn(["text-red-500", "bg-blue-500"], "p-4");
      expect(result).toBe("text-red-500 bg-blue-500 p-4");
    });

    it("Tailwind CSSのクラスが正しくマージされる", () => {
      // 同じプロパティの場合、後の値が優先される
      const result = cn("text-red-500", "text-blue-500");
      expect(result).toBe("text-blue-500");
    });

    it("異なるプロパティのクラスは両方保持される", () => {
      const result = cn("text-red-500", "bg-blue-500");
      expect(result).toBe("text-red-500 bg-blue-500");
    });

    it("パディングクラスが正しくマージされる", () => {
      const result = cn("p-2", "px-4");
      expect(result).toBe("p-2 px-4");
    });

    it("より具体的なクラスが優先される", () => {
      const result = cn("p-4", "pt-2");
      expect(result).toBe("p-4 pt-2");
    });

    it("undefined や null が無視される", () => {
      const result = cn("text-red-500", undefined, null, "bg-blue-500");
      expect(result).toBe("text-red-500 bg-blue-500");
    });

    it("空文字列が無視される", () => {
      const result = cn("text-red-500", "", "bg-blue-500");
      expect(result).toBe("text-red-500 bg-blue-500");
    });

    it("複雑な組み合わせが正しく処理される", () => {
      const isActive = true;
      const isDisabled = false;
      const variant = "primary";

      const result = cn(
        "base-class",
        {
          "active-class": isActive,
          "disabled-class": isDisabled,
        },
        variant === "primary" && "primary-class",
        ["additional-class"]
      );

      expect(result).toBe(
        "base-class active-class primary-class additional-class"
      );
    });

    it("重複するクラスが除去される", () => {
      const result = cn("text-red-500", "bg-blue-500", "text-red-500");
      expect(result).toBe("bg-blue-500 text-red-500");
    });

    it("Tailwind CSSの競合するクラスが適切に処理される", () => {
      // 後で指定されたクラスが優先される
      const result = cn("bg-red-500", "bg-blue-500", "bg-green-500");
      expect(result).toBe("bg-green-500");
    });

    it("引数なしでも動作する", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("ネストした配列が処理される", () => {
      const result = cn([["text-red-500", "bg-blue-500"], "p-4"]);
      expect(result).toBe("text-red-500 bg-blue-500 p-4");
    });

    it("実際のコンポーネント使用例のようなケース", () => {
      const size: "default" | "sm" | "lg" = "lg";
      const disabled = false;
      const variant: "default" | "destructive" | "outline" = "default";

      const result = cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 px-3": size === "sm",
          "h-11 px-8": size === "lg",
        },
        {
          "bg-primary text-primary-foreground hover:bg-primary/90":
            variant === "default",
          "bg-destructive text-destructive-foreground hover:bg-destructive/90":
            variant === "destructive",
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground":
            variant === "outline",
        },
        {
          "opacity-50 cursor-not-allowed": disabled,
        }
      );

      expect(result).toContain("h-11 px-8"); // size lg が実際に適用される
      expect(result).toContain("bg-primary"); // variant default が実際に適用される
      expect(result).not.toContain("opacity-50"); // not disabled
    });
  });
});
