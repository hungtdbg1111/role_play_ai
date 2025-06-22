
import { SUB_REALM_NAMES } from '../constants';

export const generateFanfictionWorldDetailsPrompt = (sourceMaterial: string, isSourceContent: boolean, playerInputDescription?: string, isNsfwIdea?: boolean): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai đồng nhân / fanfiction bằng tiếng Việt.
Nhiệm vụ của bạn là tạo ra các yếu tố khởi đầu cho một thế giới game đồng nhân dựa trên thông tin được cung cấp.
Mỗi cảnh giới lớn sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.

**NGUỒN CẢM HỨNG ĐỒNG NHÂN:**
${isSourceContent
    ? `Nội dung truyện gốc (một phần hoặc toàn bộ) được cung cấp bởi người dùng:\n"""\n${sourceMaterial}\n"""`
    : `Tên truyện gốc được cung cấp bởi người dùng: "${sourceMaterial}"`}

${playerInputDescription
    ? `**Mô tả/Ý tưởng thêm từ người chơi về đồng nhân:**\n"${playerInputDescription}"`
    : ""}

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ ĐỒNG NHÂN:**
- Yêu cầu nội dung 18+ (dâm dục, bạo lực): ${isNsfwIdea ? "BẬT" : "TẮT"}
${isNsfwIdea
  ? "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được BẬT cho việc tạo các yếu tố đồng nhân. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, tri thức thế giới và tóm tắt cốt truyện nguyên tác mang tính chất người lớn, nhạy cảm, dâm dục và bạo lực một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những gợi ý 18+ cho các yếu tố này. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
  : "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này."
}

**YÊU CẦU SÁNG TẠO:**
1.  **Dựa vào Nguồn Cảm Hứng Đồng Nhân (và mô tả thêm nếu có), hãy tạo ra:**
    *   **Thông Tin Nhân Vật Chính (Đồng Nhân):**
        *   Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
        *   Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
        *   Tiểu Sử (trong bối cảnh đồng nhân): [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
        *   Mục Tiêu (trong câu chuyện đồng nhân): [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
        *   Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]
    *   **Thiết Lập Thế Giới (Đồng Nhân):**
        *   Chủ Đề Thế Giới (có thể giữ nguyên từ truyện gốc hoặc biến tấu): [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
        *   Bối Cảnh Chi Tiết (mô tả rõ nhánh truyện đồng nhân này diễn ra ở đâu, khi nào so với truyện gốc): [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
        *   Văn Phong AI (phù hợp với truyện gốc hoặc yêu cầu): [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
        *   Tên Tiền Tệ (có thể giữ nguyên từ truyện gốc): [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]
        *   **Hệ Thống Cảnh Giới (nếu truyện gốc có, hãy cố gắng bám sát; nếu không, hãy tạo mới phù hợp):**
            [GENERATED_HE_THONG_CANH_GIOI: text="Hệ thống cảnh giới, ví dụ: Phàm Nhân - Luyện Khí - Trúc Cơ"]
        *   **Cảnh Giới Khởi Đầu cho Nhân Vật Đồng Nhân (phải theo định dạng "[Tên Cảnh Giới Lớn] [Tên Cảnh Giới Nhỏ]", phù hợp với hệ thống trên và bối cảnh):**
            [GENERATED_CANH_GIOI_KHOI_DAU: text="Cảnh giới khởi đầu, ví dụ: Phàm Nhân Nhất Trọng"]
    *   **Tóm Tắt Cốt Truyện Nguyên Tác (QUAN TRỌNG):** Dựa trên Nguồn Cảm Hứng Đồng Nhân, hãy **tóm tắt cốt truyện của truyện gốc (nguyên tác)**, dài khoảng 1000-1500 từ. Phần tóm tắt này nên được chia thành các giai đoạn hoặc các chương chính, mô tả các sự kiện quan trọng, xung đột và hướng phát triển của các nhân vật chính trong nguyên tác. Sử dụng tag: \\\`[GENERATED_ORIGINAL_STORY_SUMMARY: text="Giai đoạn 1 của nguyên tác: Mô tả chi tiết giai đoạn 1 của nguyên tác...\n\nGiai đoạn 2 của nguyên tác: Mô tả chi tiết giai đoạn 2 của nguyên tác...\n\n... (Tiếp tục cho đến khi đủ 1000-1500 từ và bao quát cốt truyện nguyên tác)"]\\\`
    *   **Yếu Tố Khởi Đầu Khác (Đồng Nhân - Đảm bảo cung cấp đầy đủ các tham số được yêu cầu cho mỗi tag):**
        *   **Kỹ Năng Khởi Đầu (2-3 kỹ năng):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_SKILL: name="Tên Kỹ Năng (BẮT BUỘC)", description="Mô tả ngắn gọn và hiệu ứng cơ bản (BẮT BUỘC)"]
        *   **Vật Phẩm Khởi Đầu (2-3 vật phẩm):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_ITEM: name="Tên Vật Phẩm (BẮT BUỘC)", description="Mô tả (BẮT BUỘC)", quantity=1 (BẮT BUỘC, SỐ NGUYÊN), type="Loại vật phẩm (BẮT BUỘC)"]
        *   **NPC Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ NPC quan trọng nào (từ truyện gốc hoặc NPC mới) mà bạn thấy phù hợp để làm phong phú câu chuyện đồng nhân. Hãy ưu tiên cung cấp thật nhiều NPC là nhân vật gốc truyện (Tầm 10 NPC trở lên). Cung cấp thông tin chi tiết cho mỗi NPC.
            [GENERATED_NPC: name="Tên NPC (BẮT BUỘC)", personality="Tính cách (BẮT BUỘC)", initialAffinity=0 (SỐ NGUYÊN), details="Chi tiết (BẮT BUỘC)"]
        *   **Tri Thức Thế Giới Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ khái niệm, lịch sử, địa danh, hoặc quy tắc nào (từ truyện gốc hoặc mới) để làm rõ bối cảnh đồng nhân (Tầm 10 Tri Thức Thế Giới Khởi Đầu trở lên).
            [GENERATED_LORE: title="Tiêu đề Tri Thức (BẮT BUỘC)", content="Nội dung chi tiết (BẮT BUỘC)"]
        *   **Địa Điểm Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra các Địa Điểm Khởi Đầu (từ truyện gốc hoặc mới) phù hợp với bối cảnh đồng nhân.
            [GENERATED_LOCATION: name="Tên Địa Điểm (BẮT BUỘC)", description="Mô tả địa điểm (BẮT BUỘC)", isSafeZone=false (true/false), regionId="Tên Vùng (nếu có)"]
2.  **Nếu truyện gốc là truyện 18+ thì các yếu tố được tạo ra sẽ ưu tiên mang hướng 18+ nhiều hơn, bao gồm cả tóm tắt cốt truyện nguyên tác. Nếu tùy chọn "Yêu cầu nội dung 18+" ở trên được BẬT, hãy áp dụng mức độ 18+ cao hơn nữa.**

**QUAN TRỌNG:**
- **Tóm Tắt Cốt Truyện Nguyên Tác phải chi tiết và có cấu trúc giai đoạn rõ ràng.**
- **Không giới hạn số lượng NPC, Tri Thức Thế Giới (Lore) và Địa Điểm Khởi Đầu được tạo ra.** Hãy sáng tạo thật nhiều để làm giàu thế giới đồng nhân!
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép.
- Cung cấp thông tin bằng tiếng Việt.
- Đảm bảo các yếu tố này phù hợp và nhất quán với nguồn cảm hứng đồng nhân được cung cấp.
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu.
`;
