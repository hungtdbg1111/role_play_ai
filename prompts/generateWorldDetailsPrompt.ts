
import { SUB_REALM_NAMES } from '../constants';

export const generateWorldDetailsPrompt = (storyIdea: string, isNsfwIdea: boolean): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai tu tiên bằng tiếng Việt.
Dựa trên mô tả ý tưởng cốt truyện sau đây từ người dùng, hãy tạo ra các yếu tố khởi đầu cho thế giới game.
Mỗi cảnh giới lớn sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.

**Mô tả ý tưởng:**
"${storyIdea}"

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ KHỞI ĐẦU:**
- Yêu cầu nội dung 18+ (dâm dục, bạo lực): ${isNsfwIdea ? "BẬT" : "TẮT"}
${isNsfwIdea
  ? "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được BẬT cho việc tạo các yếu tố thế giới. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, và tri thức thế giới mang tính chất người lớn, nhạy cảm, dâm dục và bạo lực một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những gợi ý 18+ cho các yếu tố này. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
  : "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này."
}

**YÊU CẦU:**
1.  **Thông Tin Nhân Vật:**
    *   Tạo Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
    *   Tạo Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
    *   Tạo Tiểu Sử: [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
    *   Tạo Mục Tiêu: [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
    *   Tạo Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]

2.  **Thiết Lập Thế Giới:**
    *   Tạo Chủ Đề Thế Giới: [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
    *   Tạo Bối Cảnh Chi Tiết: [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
    *   Tạo Văn Phong AI: [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
    *   Tạo Tên Tiền Tệ: [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]
    *   **Tạo Hệ Thống Cảnh Giới:** (Ví dụ: "Phàm Nhân - Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần - Luyện Hư - Hợp Thể - Đại Thừa - Độ Kiếp..."). Hãy thay đổi để phù hợp hơn với bối cảnh và thể loại. Phải có ít nhất 10 đại cảnh giới được tạo ra.
        [GENERATED_HE_THONG_CANH_GIOI: text="Hệ thống cảnh giới do AI tạo, phân cách bằng dấu ' - '"]
    *   **Tạo Cảnh Giới Khởi Đầu:** (Phải là một cấp độ cụ thể trong hệ thống trên, theo định dạng "[Tên Cảnh Giới Lớn] [Tên Cảnh Giới Nhỏ]", ví dụ: "Phàm Nhân Nhất Trọng", "Luyện Khí Đỉnh Phong")
        [GENERATED_CANH_GIOI_KHOI_DAU: text="Cảnh giới khởi đầu do AI tạo, ví dụ: Phàm Nhân Nhất Trọng"]

3.  **Yếu Tố Khởi Đầu Khác (Đảm bảo cung cấp đầy đủ các tham số được yêu cầu cho mỗi tag):**
    *   Tạo ra 2 đến 3 Kỹ Năng Khởi Đầu phù hợp. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_SKILL: name="Tên Kỹ Năng (BẮT BUỘC)", description="Mô tả ngắn gọn về kỹ năng và hiệu ứng cơ bản (BẮT BUỘC)"]
        Ví dụ: [GENERATED_SKILL: name="Hỏa Cầu Thuật", description="Tạo ra một quả cầu lửa nhỏ tấn công kẻ địch, tiêu hao 5 mana."]
    *   Tạo ra 2 đến 3 Vật Phẩm Khởi Đầu thú vị. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_ITEM: name="Tên Vật Phẩm (BẮT BUỘC)", description="Mô tả vật phẩm (BẮT BUỘC)", quantity=1 (BẮT BUỘC, SỐ NGUYÊN), type="Loại vật phẩm (BẮT BUỘC, rõ ràng, vd: Vũ khí, Đan dược)"]
        Ví dụ: [GENERATED_ITEM: name="Hồi Nguyên Đan", description="Phục hồi một lượng nhỏ linh lực.", quantity=3, type="Đan dược"]
    *   Tạo ra 1 đến 2 NPC Khởi Đầu quan trọng hoặc thú vị. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_NPC: name="Tên NPC (BẮT BUỘC)", personality="Tính cách nổi bật (BẮT BUỘC)", initialAffinity=0 (SỐ NGUYÊN), details="Vai trò, tiểu sử ngắn hoặc mối liên hệ với người chơi (BẮT BUỘC)"]
        Ví dụ: [GENERATED_NPC: name="Lão Tửu Quỷ", personality="Bí ẩn, ham rượu", initialAffinity=0, details="Một lão già say xỉn nhưng có vẻ biết nhiều bí mật."]
    *   Tạo ra 1 đến 2 Tri Thức Thế Giới Khởi Đầu để làm phong phú bối cảnh. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_LORE: title="Tiêu đề Tri Thức (BẮT BUỘC)", content="Nội dung chi tiết của tri thức (BẮT BUỘC)"]
        Ví dụ: [GENERATED_LORE: title="Sự Tích Thanh Vân Sơn", content="Thanh Vân Sơn là một trong tam đại linh sơn của vùng Nam Chiếu, nổi tiếng với linh khí dồi dào và nhiều truyền thuyết về tiên nhân đắc đạo."]
    *   Tạo ra 1 đến 2 Địa Điểm Khởi Đầu phù hợp. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_LOCATION: name="Tên Địa Điểm (BẮT BUỘC)", description="Mô tả địa điểm (BẮT BUỘC)", isSafeZone=false (true/false), regionId="Tên Vùng (nếu có)"]
        Ví dụ: [GENERATED_LOCATION: name="Thôn Tân Thủ", description="Một ngôi làng nhỏ yên bình, nơi bắt đầu cuộc hành trình.", isSafeZone=true, regionId="Đồng Bằng Trung Tâm"]

**QUAN TRỌNG:**
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép. Ví dụ: name="Tên Kỹ Năng", text="Mô tả chi tiết".
- Cung cấp thông tin bằng tiếng Việt.
- Hãy sáng tạo và đảm bảo các yếu tố này phù hợp với mô tả ý tưởng.
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu. Đảm bảo phản hồi chỉ chứa các tag.
`;
